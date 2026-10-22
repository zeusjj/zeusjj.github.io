(() => {
 const rows=data=>window.GuildAuth?.user?.isAdmin&&Array.isArray(data?.archivedMembers)?data.archivedMembers:[];
 window.GuildMemberArchive={rows,all:data=>[...(data?.members??[]),...rows(data)],has:(data,name)=>rows(data).some(row=>row[data.headers.indexOf('닉네임')]===name)};
})();
