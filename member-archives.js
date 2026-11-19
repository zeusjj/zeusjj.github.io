(() => {
 const rows=data=>window.GuildAuth?.user?.isAdmin&&Array.isArray(data?.archivedMembers)?data.archivedMembers:[];
 window.GuildMemberArchive={rows,all:data=>[...(data?.members??[]),...rows(data)],has:(data,name)=>{const index=data?.headers?.indexOf('닉네임')??-1;if(index<0||(data.members??[]).some(row=>row[index]===name))return false;return rows(data).some(row=>row[index]===name);}};
})();
